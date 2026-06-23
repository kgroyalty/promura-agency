import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { TestimonialComponent } from '@gitroom/frontend/components/auth/testimonial.component';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <div className="bg-[#0E0E0E] flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen text-white">
      {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
      <ReturnUrlComponent />
      <div className="flex flex-col py-[40px] px-[20px] flex-1 lg:w-[600px] lg:flex-none rounded-[12px] text-white p-[12px] bg-[#1A1919]">
        <div className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col text-white">
          <img
            src="/logo-text.svg"
            alt="Promura Agency"
            className="h-[48px] w-auto"
          />
          <div className="flex">{children}</div>
        </div>
      </div>
      <div className="flex-1 pt-[64px] hidden lg:flex flex-col items-center justify-start px-[40px] gap-[40px]">
        <div className="text-center max-w-[640px]">
          <div className="text-[14px] tracking-[4px] text-[#ff3daa] uppercase mb-[12px]">
            Promura Agency
          </div>
          <div className="text-[48px] leading-[1.1] font-bold">
            Let&apos;s go <span className="text-[#ff3daa]">viral.</span>
          </div>
          <div className="text-[16px] text-white/60 mt-[16px] leading-[1.5]">
            Magazine, social media &amp; influencer management.
            <br />
            Editorial production. Multi-platform scheduling.
          </div>
        </div>
        <TestimonialComponent />
      </div>
    </div>
  );
}
