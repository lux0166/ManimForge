import React from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  X,
  Edit3,
  Home,
  Search,
  Plus,
  Sparkles,
  Settings,
  PanelLeftClose,
  UserPlus,
  type LucideProps
} from "lucide-react";

export const IconArrowBoxLeft = (props: { size?: number; className?: string }) => <ArrowLeft size={props.size ?? 16} className={props.className} />;
export const IconCheckmark1Small = (props: { size?: number; className?: string }) => <Check size={props.size ?? 16} className={props.className} />;
export const IconChevronDownSmall = (props: { size?: number; className?: string }) => <ChevronDown size={props.size ?? 16} className={props.className} />;
export const IconCrossSmall = (props: { size?: number; className?: string }) => <X size={props.size ?? 16} className={props.className} />;
export const IconEditBig = (props: { size?: number; className?: string }) => <Edit3 size={props.size ?? 18} className={props.className} />;
export const IconHome = (props: { size?: number; className?: string }) => <Home size={props.size ?? 18} className={props.className} />;
export const IconMagnifyingGlass = (props: { size?: number; className?: string }) => <Search size={props.size ?? 16} className={props.className} />;
export const IconPlusMedium = (props: { size?: number; className?: string }) => <Plus size={props.size ?? 16} className={props.className} />;
export const IconPopsicle2 = (props: { size?: number; className?: string }) => <Sparkles size={props.size ?? 18} className={props.className} />;
export const IconSettingsGear1 = (props: { size?: number; className?: string }) => <Settings size={props.size ?? 16} className={props.className} />;
export const IconSidebarLeftArrow = (props: { size?: number; className?: string }) => <PanelLeftClose size={props.size ?? 18} className={props.className} />;
export const IconUserAdd = (props: { size?: number; className?: string }) => <UserPlus size={props.size ?? 18} className={props.className} />;
