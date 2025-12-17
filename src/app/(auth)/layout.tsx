export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    /* Removemos toda a estilização visual (bg, border, shadow) daqui.
      Agora este layout serve apenas como um container transparente,
      deixando a página de login (page.tsx) controlar 100% do visual.
    */
    <div className="w-full min-h-screen">
      {children}
    </div>
  );
}