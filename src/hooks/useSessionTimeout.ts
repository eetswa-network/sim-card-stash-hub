import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const useSessionTimeout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSessionTimeout = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

      if (lastActivity && (now - parseInt(lastActivity)) > oneHour) {
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

    // Check session on component mount
    checkSessionTimeout();

    // Update last activity on user interaction
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateLastActivity, true);
    });

    // Check session timeout every minute
    const interval = setInterval(checkSessionTimeout, 60000);

    // Initial activity update
    updateLastActivity();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateLastActivity, true);
      });
      clearInterval(interval);
    };
  }, [navigate, toast]);
};