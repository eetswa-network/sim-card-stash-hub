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
  // Handle standard base64 or base64url
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Handle bytea from Supabase - it could be base64 encoded or raw bytes
function decodePublicKey(storedKey: any): Uint8Array {
  // If it's a string, it might be:
  // 1. Base64url encoded COSE key (correct format)
  // 2. Double-encoded JSON string (legacy bug)
  if (typeof storedKey === 'string') {
    // Check if it looks like double-encoded (starts with base64 of JSON)
    try {
      const decoded = atob(storedKey.replace(/-/g, '+').replace(/_/g, '/'));
      // If it starts with a quote or brace, it's likely JSON stringified
      if (decoded.startsWith('"') || decoded.startsWith('{')) {
        // It was double-encoded - decode the JSON first
        const innerData = JSON.parse(decoded);
        if (typeof innerData === 'string') {
          // Now decode the actual base64url key
          return base64URLToUint8Array(innerData);
        }
      }
    } catch {
      // Not double-encoded, treat as direct base64url
    }
    
    // Direct base64url encoded key
    return base64URLToUint8Array(storedKey);
  }
  
  // If it's already bytes (Uint8Array), return as-is
  if (storedKey instanceof Uint8Array) {
    return storedKey;
  }
  
  throw new Error('Unknown public key format');
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  record.count++;
  return record.count <= maxAttempts;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many attempts, please try again later" }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
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
      console.log("Missing required fields:", { credential_id: !!credential_id, authenticator_data: !!authenticator_data, client_data_json: !!client_data_json, signature: !!signature, challenge: !!challenge });
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
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Found passkey for user:", passkey.user_id);
    console.log("Public key type:", typeof passkey.credential_public_key);
    console.log("Public key preview:", String(passkey.credential_public_key).substring(0, 50));

    // Get origin from request headers
    const origin = req.headers.get('origin') || 'https://zltcbjwkbzmuqiwqsfwv.lovableproject.com';
    const rpID = new URL(origin).hostname;

    console.log("Using origin:", origin, "rpID:", rpID);

    // Decode the public key (handles both legacy double-encoded and correct format)
    let publicKeyBytes: Uint8Array;
    try {
      publicKeyBytes = decodePublicKey(passkey.credential_public_key);
      console.log("Decoded public key length:", publicKeyBytes.length);
    } catch (decodeError) {
      console.error("Failed to decode public key:", decodeError);
      return new Response(
        JSON.stringify({ error: "Invalid credential public key format" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          publicKey: publicKeyBytes,
          counter: passkey.counter || 0,
          transports: passkey.transports || [],
        },
      });

      if (!verification.verified) {
        console.error("Passkey verification failed - not verified");
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
      console.error("Error details:", verifyError.message, verifyError.stack);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
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
