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
    <Section id="faq">
      <SectionHeader
        eyebrow={faqContent.eyebrow}
        title={faqContent.title}
      />
      <div className="mx-auto mt-12 max-w-3xl">
        <Accordion type="single" collapsible className="bg-card">
          {faqContent.items.map((item, idx) => (
            <AccordionItem key={item.question} value={`item-${idx}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
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
