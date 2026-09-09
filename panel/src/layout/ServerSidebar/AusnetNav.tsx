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

/** Initials for the avatar when an admin has no Discord profile picture. */
function initialsOf(name: string) {
    return name
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join('');
}

function NavRow({ item, disabled }: { item: NavItem; disabled: boolean }) {
    const [isActive] = useRoute(item.href);
    const { Icon } = item;

    const body = (
        <>
            {/* Active indicator: a 3px gradient bar on the left edge, rounded
                on the outer side only. Always rendered so the row does not
                shift when it becomes active. */}
            <span aria-hidden className="ausnet-navbar-indicator" />
            <Icon className="ausnet-navicon" />
            <span className="truncate">{item.label}</span>
        </>
    );

    const rowClasses = cn(
        'ausnet-navitem',
        isActive && 'is-active',
        disabled && 'is-disabled',
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
        <nav className="ausnet-nav flex flex-col select-none">
            {/* Brand bar: 4rem tall with its own bottom rule, matching the
                website's admin panel. The logo is 26px tall at natural aspect;
                the asset is rendered at 2x for HiDPI. */}
            <div className="ausnet-brandbar">
                <img
                    src="img/ausnet-logo.png"
                    alt=""
                    className="h-[26px] w-auto shrink-0 object-contain"
                />
                <div className="min-w-0">
                    <div className="ausnet-brandname">AusNetworks</div>
                    <div className="ausnet-brandrole">txAdmin</div>
                </div>
            </div>

            {SECTIONS.map((section) => (
                <div key={section.heading} className="flex flex-col">
                    <div className="ausnet-navgroup">{section.heading}</div>
                    {section.items.map((item) => (
                        <NavRow
                            key={item.href}
                            item={item}
                            disabled={!!item.perm && !hasPerm(item.perm as any)}
                        />
                    ))}
                </div>
            ))}

            {/* Account footer. Reference: .sidefoot / .usercard / .avatar,
                with the 1px gradient ring drawn by a masked pseudo-element so
                the card keeps a solid surface behind it. */}
            {authData && (
                <div className="ausnet-sidefoot">
                    <div className="ausnet-usercard">
                        <div className="ausnet-avatar">
                            {authData.profilePicture
                                ? <img src={authData.profilePicture} alt="" />
                                : initialsOf(authData.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="ausnet-username truncate">{authData.name}</div>
                            <div className="ausnet-userrole truncate">
                                {authData.isMaster ? 'Master admin' : 'Admin'}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => logout()}
                            title="Sign out"
                            aria-label="Sign out"
                            className="relative z-[1] shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/[.06] transition-colors"
                        >
                            <LogOut className="size-4" />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
