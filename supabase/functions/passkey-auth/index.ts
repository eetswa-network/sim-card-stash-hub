import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { verifyAuthenticationResponse } from "https://esm.sh/@simplewebauthn/server@13.1.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasskeyAuthRequest {
  credential_id: string;
  authenticator_data: string;
  client_data_json: string;
  signature: string;
  challenge: string;
}

// Convert base64url to Uint8Array
function base64URLToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body: PasskeyAuthRequest = await req.json();
    const { credential_id, authenticator_data, client_data_json, signature, challenge } = body;

    console.log("Passkey auth request for credential:", credential_id);

    if (!credential_id || !authenticator_data || !client_data_json || !signature || !challenge) {
      return new Response(
        JSON.stringify({ error: "Missing required authentication data" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the passkey by credential_id
    const { data: passkey, error: fetchError } = await supabaseAdmin
      .from("user_passkeys")
      .select("user_id, counter, credential_public_key, credential_id, transports")
      .eq("credential_id", credential_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Database error looking up passkey:", fetchError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!passkey) {
      console.log("Passkey not found for credential:", credential_id);
      return new Response(
        JSON.stringify({ error: "Passkey not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Found passkey for user:", passkey.user_id);

    // Get origin from request headers
    const origin = req.headers.get('origin') || 'https://zltcbjwkbzmuqiwqsfwv.lovableproject.com';
    const rpID = new URL(origin).hostname;

    // Verify the WebAuthn signature cryptographically
    try {
      const verification = await verifyAuthenticationResponse({
        response: {
          id: credential_id,
          rawId: credential_id,
          response: {
            authenticatorData: authenticator_data,
            clientDataJSON: client_data_json,
            signature: signature,
          },
          type: 'public-key',
          clientExtensionResults: {},
          authenticatorAttachment: 'platform',
        },
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credential_id,
          publicKey: base64URLToUint8Array(passkey.credential_public_key),
          counter: passkey.counter,
          transports: passkey.transports || [],
        },
      });

      if (!verification.verified) {
        console.error("Passkey verification failed");
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log("Passkey signature verified successfully");

      // Update the counter to prevent replay attacks
      const newCounter = verification.authenticationInfo.newCounter;
      const { error: updateError } = await supabaseAdmin
        .from("user_passkeys")
        .update({ 
          counter: newCounter,
          last_used_at: new Date().toISOString()
        })
        .eq("credential_id", credential_id);

      if (updateError) {
        console.error("Failed to update passkey counter:", updateError);
      }

    } catch (verifyError) {
      console.error("Signature verification error:", verifyError);
      return new Response(
        JSON.stringify({ error: "Authentication verification failed" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email for session creation
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      passkey.user_id
    );

    if (userError || !authUser?.user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Creating session for user:", authUser.user.email);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email!,
      options: {
        redirectTo: `${origin}/`,
      }
    });

    if (linkError) {
      console.error("Failed to generate magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Passkey authentication successful for:", authUser.user.email);

    return new Response(
      JSON.stringify({ 
        success: true,
        verification_url: linkData.properties?.verification_url,
        email: authUser.user.email,
        message: "Passkey verified. Use the verification URL to complete login."
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Passkey auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
