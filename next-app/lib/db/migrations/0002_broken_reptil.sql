CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"visibility" text DEFAULT 'draft' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"author_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_visibility_check" CHECK ("task"."visibility" IN ('draft', 'active', 'archived')),
	CONSTRAINT "task_status_check" CHECK ("task"."status" IN ('pending', 'in_progress', 'done'))
);
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_organization_id_idx" ON "task" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_author_id_idx" ON "task" USING btree ("author_id");