import { useRoute } from 'wouter';
import { cn } from '@/lib/utils';
import MainPageLink from '@/components/MainPageLink';
import { useAdminPerms, useAuth } from '@/hooks/auth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Users, History, TrendingDown, ListChecks, ShieldCheck, Settings,
    Zap, Stethoscope, Terminal, ScrollText, LogOut,
} from 'lucide-react';

/*
 * AusNetworks addition: the page navigation as a left rail, matching the
 * website's admin panel.
 *
 * Upstream puts these links in the top bar (DesktopNavbar), with System as a
 * hover dropdown. This renders the same routes with the same permission
 * gating, vertically instead, and DesktopNavbar is hidden on desktop.
 *
 * When rebasing onto a new txAdmin release, check DesktopNavbar for added or
 * renamed routes - they will not appear here automatically.
 */

type NavItem = {
    href: string;
    label: string;
    Icon: typeof Users;
    perm?: string;
};

const SECTIONS: { heading: string; items: NavItem[] }[] = [
    {
        heading: 'Management',
        items: [
            { href: '/players', label: 'Players', Icon: Users },
            { href: '/history', label: 'History', Icon: History },
            { href: '/insights/player-drops', label: 'Player Drops', Icon: TrendingDown },
            { href: '/allowlist', label: 'Allowlist', Icon: ListChecks },
            { href: '/admins', label: 'Admins', Icon: ShieldCheck, perm: 'manage.admins' },
            { href: '/settings', label: 'Settings', Icon: Settings, perm: 'settings.view' },
        ],
    },
    {
        heading: 'System',
        items: [
            { href: '/system/master-actions', label: 'Master Actions', Icon: Zap },
            { href: '/system/diagnostics', label: 'Diagnostics', Icon: Stethoscope },
            { href: '/system/console-log', label: 'Console Log', Icon: Terminal, perm: 'txadmin.log.view' },
            { href: '/system/action-log', label: 'Action Log', Icon: ScrollText, perm: 'txadmin.log.view' },
        ],
    },
];

function NavRow({ item, disabled }: { item: NavItem; disabled: boolean }) {
    const [isActive] = useRoute(item.href);
    const { Icon } = item;

    const body = (
        <>
            {/* Active indicator: a 3px gradient bar on the left edge, rounded
                on the outer side only. Always rendered so the row does not
                shift when it becomes active. */}
            <span
                aria-hidden
                className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 h-[70%] w-[3px] rounded-r-full transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                )}
                style={{ backgroundImage: 'var(--ausnet-grad)' }}
            />
            <Icon className={cn('size-4 shrink-0 transition-colors', isActive && 'text-primary')} />
            <span className="truncate">{item.label}</span>
        </>
    );

    const rowClasses = cn(
        'relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition-colors',
        isActive
            ? 'bg-white/[.06] text-white font-medium'
            : 'text-muted-foreground hover:bg-white/[.035] hover:text-white',
        disabled && 'opacity-50 pointer-events-none',
    );

    if (disabled) {
        return (
            <Tooltip>
                <TooltipTrigger className="cursor-help w-full">
                    <div className={rowClasses}>{body}</div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-destructive-inline text-center">
                    You do not have permission <br /> to access this page.
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <MainPageLink href={item.href} isActive={isActive} className={rowClasses}>
            {body}
        </MainPageLink>
    );
}

export default function AusnetNav() {
    const { hasPerm } = useAdminPerms();
    const { authData, logout } = useAuth();

    return (
        <nav className="flex flex-col gap-1 select-none">
            {/* Brand */}
            <div className="px-3 pb-3">
                <div
                    className="text-sm font-semibold leading-tight"
                    style={{
                        backgroundImage: 'var(--ausnet-grad-text)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                    }}
                >
                    AusNetworks
                </div>
                <div
                    className="ausnet-eyebrow mt-0.5"
                    style={{ fontSize: '10.5px', letterSpacing: '.18em' }}
                >
                    txAdmin
                </div>
            </div>

            {SECTIONS.map((section) => (
                <div key={section.heading} className="flex flex-col gap-0.5">
                    <div
                        className="px-3 pt-4 pb-1.5 font-semibold uppercase"
                        style={{ fontSize: '10.5px', letterSpacing: '.2em', color: '#525252' }}
                    >
                        {section.heading}
                    </div>
                    {section.items.map((item) => (
                        <NavRow
                            key={item.href}
                            item={item}
                            disabled={!!item.perm && !hasPerm(item.perm as any)}
                        />
                    ))}
                </div>
            ))}

            {/* Account footer: a card inside a 1px gradient ring */}
            {authData && (
                <div
                    className="mt-5 rounded-xl p-px"
                    style={{ backgroundImage: 'var(--ausnet-grad)' }}
                >
                    <div className="flex items-center gap-2.5 rounded-[calc(0.75rem-1px)] bg-black/90 px-2.5 py-2">
                        {authData.profilePicture ? (
                            <img
                                src={authData.profilePicture}
                                alt=""
                                className="size-7 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <div className="size-7 rounded-full bg-secondary shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-white">
                                {authData.name}
                            </div>
                            <div
                                className="truncate text-primary"
                                style={{ fontSize: '10.5px', letterSpacing: '.14em' }}
                            >
                                {authData.isMaster ? 'MASTER' : 'ADMIN'}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => logout()}
                            title="Sign out"
                            aria-label="Sign out"
                            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/[.06] transition-colors"
                        >
                            <LogOut className="size-4" />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
