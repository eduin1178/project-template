import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Pains } from "@/components/landing/pains";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Audiences } from "@/components/landing/audiences";
import { Benefits } from "@/components/landing/benefits";
import { Integrations } from "@/components/landing/integrations";
import { Security } from "@/components/landing/security";
import { SocialProof } from "@/components/landing/social-proof";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { RequestDemoProvider } from "@/components/landing/request-demo-context";
import { RequestDemoDialog } from "@/components/landing/request-demo-dialog";

export default function HomePage() {
  return (
    <RequestDemoProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Hero />
          <Pains />
          <HowItWorks />
          <Features />
          <Audiences />
          <Benefits />
          <Integrations />
          <Security />
          <SocialProof />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
      <RequestDemoDialog />
    </RequestDemoProvider>
  );
}
