CREATE TABLE "task_document" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"uploader_id" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_document" ADD CONSTRAINT "task_document_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_document" ADD CONSTRAINT "task_document_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_document_task_id_created_at_idx" ON "task_document" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_document_storage_key_unique" ON "task_document" USING btree ("storage_key");