import { DESIGNER_PROFILE } from '../../data/mockCreator'
import { useCommunityProfile } from '../../context/CommunityProfileContext'

function LinkIcon({ platform }) {
  const common = 'h-4 w-4'
  if (platform === 'twitter') {
    return (
      <svg className={common} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.935L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    )
  }
  if (platform === 'behance') {
    return (
      <svg className={common} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M8.5 11.1c.9-.3 1.4-1 1.4-2 0-1.7-1.3-2.6-3.4-2.6H2.5v10.9h4.3c2.3 0 3.8-1.1 3.8-3.1 0-1.4-.7-2.4-2.1-2.8zM5 8.2h1.5c.8 0 1.2.3 1.2.9s-.4.9-1.2.9H5V8.2zm1.8 6.3H5v-2.3h1.8c.9 0 1.4.4 1.4 1.2s-.5 1.1-1.4 1.1zM21.5 10.6c-.5-2.5-2.3-4.1-5-4.1-3 0-5.1 2.2-5.1 5.2 0 3.1 2.1 5.2 5.2 5.2 2.5 0 4.3-1.3 4.9-3.5h-2.5c-.3.8-1.1 1.3-2.3 1.3-1.6 0-2.6-1.1-2.7-2.7h7.5v-.7c0-.2 0-.5-.1-.7zm-7.4-.5c.2-1.4 1.2-2.4 2.5-2.4 1.4 0 2.3 1 2.4 2.4h-4.9zM15.4 5.2h4.4V3.8h-4.4v1.4z" />
      </svg>
    )
  }
  if (platform === 'dribbble') {
    return (
      <svg className={common} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.32c-.295-.054-3.23-.669-6.185-.29-.226-.54-.446-1.085-.676-1.634 3.33-1.36 4.835-3.27 4.931-3.396zM12 3.866c1.468 0 2.813.43 3.95 1.16-.084.119-1.438 1.904-4.508 3.08-.925-1.69-1.95-3.12-2.096-3.32A8.41 8.41 0 0112 3.866zM5.385 5.55c.14.19 1.22 1.65 2.17 3.35C5.06 10.4 2.95 12.02 2.75 12.15A8.53 8.53 0 015.385 5.55zM3.866 12c0-.09.002-.18.005-.268.178-.12 2.6-1.72 5.22-3.2.61 1.19 1.19 2.41 1.72 3.64-2.53.72-4.81 2.63-5.52 3.31A8.46 8.46 0 013.866 12zm2.02 5.24c.68-.63 2.7-2.39 5.42-3.08.85 2.22 1.51 4.48 1.72 5.33A8.52 8.52 0 015.886 17.24zM12 20.134a8.45 8.45 0 01-2.03-.245c-.15-.59-.75-2.74-1.63-4.95 2.5.52 5.16.4 7.7-.2.71.98 1.33 1.98 1.8 2.78A8.43 8.43 0 0112 20.134zm6.22-2.73c-.41-.7-.95-1.58-1.59-2.48 2.67-.42 5.25.23 5.54.3a8.52 8.52 0 01-3.95 2.18z" />
      </svg>
    )
  }
  return (
    <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  )
}

/**
 * Full-height designer portfolio panel (not a half scroll card).
 */
export default function DesignerPortfolio({ onBack, onViewProjects }) {
  const { profile: communityProfile } = useCommunityProfile()

  const name = communityProfile?.name || DESIGNER_PROFILE.name
  const bio =
    communityProfile?.designerBio ||
    communityProfile?.designerTagline ||
    DESIGNER_PROFILE.bio

  const skills =
    Array.isArray(communityProfile?.designerSkills) && communityProfile.designerSkills.length
      ? communityProfile.designerSkills.map((s) => ({
          name: s.name,
          level: Number(s.proficiency) || 0,
        }))
      : DESIGNER_PROFILE.skills

  const links =
    Array.isArray(communityProfile?.designerSocialLinks) &&
    communityProfile.designerSocialLinks.length
      ? communityProfile.designerSocialLinks
          .filter((l) => l.enabled !== false && l.url)
          .map((l) => ({
            platform: l.platform,
            label: l.label || l.platform,
            url: l.url,
          }))
      : DESIGNER_PROFILE.links

  return (
    <div className="scrollbar-hide flex h-full min-h-[560px] w-full max-w-[380px] flex-col overflow-y-auto bg-black px-5 pb-8 pt-5 text-white sm:max-w-[400px] sm:px-6 sm:pt-6">
      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="min-w-0 flex-1 truncate font-inter text-[15px] font-semibold text-white">
          {name}
        </h2>
        <button
          type="button"
          onClick={onViewProjects}
          className="shrink-0 cursor-pointer rounded-full bg-[#7C5CFF] px-3.5 py-2 font-inter text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#6d4ef0]"
        >
          View Projects
        </button>
      </div>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <section>
          <h3 className="font-refer-display text-[1.75rem] font-normal leading-tight tracking-tight text-white">
            About Me
          </h3>
          <p className="mt-3 font-geist text-[13px] leading-relaxed text-white/70">
            {bio}
          </p>
        </section>

        <section className="mt-8">
          <ul className="space-y-4">
            {links.map((link) => (
              <li key={`${link.platform}-${link.url}`}>
                <a
                  href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 transition hover:opacity-90"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                    <LinkIcon platform={link.platform} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-inter text-sm font-semibold capitalize text-white">
                      {link.label}
                    </span>
                    <span className="block truncate font-inter text-xs text-white/45">
                      {link.url}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h3 className="font-refer-display text-[1.55rem] font-normal tracking-tight text-white">
            Skills & Expertise
          </h3>
          <ul className="mt-5 space-y-5">
            {skills.map((skill) => (
              <li key={skill.name}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-inter text-sm font-medium text-white">{skill.name}</span>
                  <span className="font-inter text-sm text-white/70">{skill.level}%</span>
                </div>
                <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#7C5CFF]"
                    style={{ width: `${Math.min(100, Math.max(0, skill.level))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
