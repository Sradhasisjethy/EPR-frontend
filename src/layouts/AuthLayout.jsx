import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* High Definition Cement Factory Industrial Wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105"
        style={{ backgroundImage: "url('/cement-factory-bg.png')" }}
      />

      {/* Dark Translucent Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-md" />

      {/* Glowing Industrial Accent Flares */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-6">
        <Outlet />
      </div>
    </div>
  );
}
