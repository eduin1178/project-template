/**
 * ThemeScript — Server Component
 *
 * Inyecta un script síncrono en <head> que aplica la clase de tema correcta
 * sobre <html> ANTES de que el navegador pinte la página. Esto evita el FOUC
 * (flash de tema incorrecto) sin que React tenga que renderizar el <script>
 * desde un Client Component, que es lo que dispara el warning de React 19
 * "Encountered a script tag while rendering React component".
 *
 * Debe ir como hijo directo de <head> en app/layout.tsx.
 */

const SCRIPT = `(function(){try{var t=localStorage.getItem('theme')||'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(r);d.style.colorScheme=r;}catch(e){}})();`;

export function ThemeScript() {
  return (
    <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
  );
}
