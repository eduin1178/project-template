"use client";

import { Section, SectionHeader } from "./section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqContent } from "@/content/landing";

export function Faq() {
  return (
    <Section id="faq" className="bg-muted/30">
      <SectionHeader eyebrow={faqContent.eyebrow} title={faqContent.title} />
      <div className="mx-auto mt-12 max-w-3xl">
        <Accordion
          type="single"
          collapsible
          className="overflow-hidden rounded-3xl border border-border/60 bg-card"
        >
          {faqContent.items.map((item, idx) => (
            <AccordionItem
              key={item.question}
              value={`item-${idx}`}
              className="border-border/60 px-4 last:border-b-0 sm:px-6"
            >
              <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{item.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
