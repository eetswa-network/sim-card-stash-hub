import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const useSessionTimeout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSessionTimeout = async () => {
      // First check if user is actually signed in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return; // No session, no need to check timeout
      }

      const lastActivity = localStorage.getItem('lastActivity');
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

      // If no lastActivity recorded, set it now (fresh login)
      if (!lastActivity) {
        localStorage.setItem('lastActivity', now.toString());
        return;
      }

      if ((now - parseInt(lastActivity)) > oneHour) {
        // Session has expired
        supabase.auth.signOut();
        localStorage.removeItem('lastActivity');
        toast({
          title: "Session expired",
          description: "You have been signed out due to inactivity.",
          variant: "destructive"
        });
        navigate('/auth');
      }
    };

    const updateLastActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // Update last activity immediately (for fresh sessions)
    updateLastActivity();

    // Check session timeout after a brief delay to allow auth to settle
    const timeoutId = setTimeout(checkSessionTimeout, 1000);

    // Update last activity on user interaction
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateLastActivity, true);
    });

    // Check session timeout every minute
    const interval = setInterval(checkSessionTimeout, 60000);

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, updateLastActivity, true);
      });
      clearInterval(interval);
    };
  }, [navigate, toast]);
};