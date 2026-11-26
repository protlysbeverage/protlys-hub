-- Permit the feedback API to record delivery status for the signed-in user's own submission.
ALTER TABLE public.feedback_submissions
  DROP CONSTRAINT IF EXISTS feedback_submissions_status_check;

ALTER TABLE public.feedback_submissions
  ADD CONSTRAINT feedback_submissions_status_check
  CHECK (status IN ('new', 'sent', 'email_failed', 'email_not_configured'));

CREATE POLICY "Users can update their own feedback delivery status"
  ON public.feedback_submissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
