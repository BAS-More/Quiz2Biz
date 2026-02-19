-- Add conversation_messages table for AI conversational questionnaire flow
-- Stores user/assistant/system messages per session for richer document generation

CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversation_messages_session_id_idx" ON "conversation_messages"("session_id");
CREATE INDEX "conversation_messages_session_id_created_at_idx" ON "conversation_messages"("session_id", "created_at");

ALTER TABLE "conversation_messages"
    ADD CONSTRAINT "conversation_messages_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
