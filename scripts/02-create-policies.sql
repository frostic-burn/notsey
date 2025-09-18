-- Notes table policies
CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- AI chats table policies
CREATE POLICY "Users can view their own ai chats" ON public.ai_chats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai chats" ON public.ai_chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai chats" ON public.ai_chats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai chats" ON public.ai_chats
    FOR DELETE USING (auth.uid() = user_id);
