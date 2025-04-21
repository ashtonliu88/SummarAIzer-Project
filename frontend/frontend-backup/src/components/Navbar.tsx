import { User, Home } from "lucide-react";
import React from "react";

const navLinks = [
  { name: "Home", href: "#" },
  { name: "My Library", href: "#" },
  { name: "Login", href: "#" },
];

const Navbar = () => (
  <nav className="w-full bg-primary flex items-center justify-between px-8 py-3 shadow-sm font-nunito overflow-x-auto min-h-16">
    <div className="flex items-center gap-2">
      <span className="font-bold text-white text-xl tracking-tight">SummarAlze</span>
    </div>
    <div className="flex gap-1">
      {navLinks.map((link, idx) => (
        <a
          key={link.name}
          href={link.href}
          className={`px-5 py-1.5 mx-1 rounded-full transition-colors text-base font-semibold ${
            idx === 0 ? "bg-white text-primary" : "text-white hover:bg-white/10"
          }`}
        >
          {link.name}
        </a>
      ))}
    </div>
    <div>
      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-primary font-bold text-lg border-2 border-primary">
        <User size={20} />
      </div>
    </div>
  </nav>
);

export default Navbar;