-- Create interviews table
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    persona_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    final_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create transcripts table
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Create policies for interviews
CREATE POLICY "Users can insert their own interviews" 
    ON interviews FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interviews" 
    ON interviews FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviews" 
    ON interviews FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interviews" 
    ON interviews FOR DELETE 
    USING (auth.uid() = user_id);

-- Create policies for transcripts
CREATE POLICY "Users can insert transcripts for their interviews" 
    ON transcripts FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM interviews 
            WHERE interviews.id = transcripts.interview_id 
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view transcripts for their interviews" 
    ON transcripts FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM interviews 
            WHERE interviews.id = transcripts.interview_id 
            AND interviews.user_id = auth.uid()
        )
    );
