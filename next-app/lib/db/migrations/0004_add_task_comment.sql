CREATE TABLE "task_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by_name" text,
	"deleted_by_email" text
);
--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_comment_task_id_created_at_idx" ON "task_comment" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_comment_author_id_idx" ON "task_comment" USING btree ("author_id");