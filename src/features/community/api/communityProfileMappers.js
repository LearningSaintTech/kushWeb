/**
 * Map between community wizard form state and community-profile API payloads.
 */

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const DESIGNER_STEP_TO_INDEX = {
  not_started: 1,
  essentials: 1,
  scene: 2,
  skills: 3,
  experience: 4,
  education: 5,
  story: 6,
  links: 7,
  completed: 8,
};

export const CREATOR_STEP_TO_INDEX = {
  not_started: 1,
  photo: 1,
  basic: 2,
  about: 3,
  private: 4,
  completed: 5,
};

export function designerStepIndex(profile) {
  const key = profile?.designerOnboardingStep || 'not_started';
  return DESIGNER_STEP_TO_INDEX[key] ?? 1;
}

export function creatorStepIndex(profile) {
  const key = profile?.creatorOnboardingStep || 'not_started';
  return CREATOR_STEP_TO_INDEX[key] ?? 1;
}

export function mapGenderToApi(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'f' || v === 'female') return 'f';
  if (v === 'm' || v === 'male') return 'm';
  if (v === 'trans' || v === 'tran') return 'trans';
  if (v === 'prefer_not_to_say' || v === 'prefer-not' || v === 'non-binary') {
    return 'prefer_not_to_say';
  }
  return undefined;
}

export function mapGenderFromApi(value) {
  if (value === 'f') return 'female';
  if (value === 'm') return 'male';
  if (value === 'trans') return 'trans';
  if (value === 'prefer_not_to_say') return 'prefer-not';
  return '';
}

/** Strip to Indian 10-digit mobile when possible. */
export function normalizePhoneForApi(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits || undefined;
}

export function buildDesignerEssentialsBody(form) {
  return {
    name: form.fullName?.trim() || undefined,
    username: String(form.username || '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase() || undefined,
    location: form.location?.trim() || undefined,
  };
}

export function buildDesignerSceneFormData(form) {
  const fd = new FormData();
  if (form.profilePhoto instanceof File) fd.append('profileImage', form.profilePhoto);
  if (form.coverImage instanceof File) fd.append('coverImage', form.coverImage);
  return fd;
}

export function buildDesignerSkillsBody(form) {
  return (form.skills || [])
    .filter((s) => s?.name?.trim())
    .map((s) => ({
      name: s.name.trim(),
      proficiency: Math.min(100, Math.max(0, Number(s.level) || 0)),
    }));
}

export function buildDesignerExperienceBody(form) {
  return (form.experience || [])
    .filter((r) => r?.jobTitle?.trim() || r?.company?.trim())
    .map((r) => {
      const isPresent = r.endYear === 'Present' || !r.endYear;
      return {
        title: r.jobTitle?.trim() || '',
        company: r.company?.trim() || '',
        startDate: r.startYear ? String(r.startYear) : '',
        endDate: isPresent ? '' : String(r.endYear || ''),
        isPresent,
        description: r.description?.trim() || '',
      };
    });
}

export function buildDesignerEducationBody(form) {
  return (form.education || [])
    .filter((e) => e?.degree?.trim() || e?.institution?.trim())
    .map((e) => {
      const range = String(e.dateRange || '').trim();
      let startDate = '';
      let endDate = '';
      if (range.includes('-')) {
        const [a, b] = range.split('-').map((p) => p.trim());
        startDate = a || '';
        endDate = b && b.toLowerCase() !== 'present' ? b : '';
      } else if (range) {
        startDate = range;
      }
      return {
        degree: e.degree?.trim() || '',
        institution: e.institution?.trim() || '',
        fieldOfStudy: e.field?.trim() || '',
        startDate,
        endDate: e.currentlyStudying ? '' : endDate,
        isPresent: Boolean(e.currentlyStudying),
      };
    });
}

export function buildDesignerStoryBody(form) {
  return {
    tagline: String(form.tags || '').trim().slice(0, 80) || undefined,
    bio: String(form.bio || '').trim().slice(0, 300) || undefined,
  };
}

export function buildDesignerLinksBody(form) {
  const links = [];
  const hubs = form.hubs || {};
  for (const platform of ['dribbble', 'behance', 'twitter', 'website']) {
    const hub = hubs[platform];
    if (!hub) continue;
    links.push({
      platform,
      url: String(hub.url || '').trim(),
      label: '',
      enabled: Boolean(hub.enabled),
    });
  }
  for (const custom of form.customLinks || []) {
    if (!custom?.url?.trim()) continue;
    links.push({
      platform: 'custom',
      url: String(custom.url).trim(),
      label: String(custom.title || '').trim(),
      enabled: true,
    });
  }
  return links;
}

export function buildCreatorPhotoFormData(form) {
  const fd = new FormData();
  if (form.photo instanceof File) fd.append('profileImage', form.photo);
  return fd;
}

export function buildCreatorBasicBody(form) {
  return {
    name: form.fullName?.trim() || undefined,
    username: String(form.username || '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase() || undefined,
  };
}

export function buildCreatorAboutBody(form) {
  return {
    bio: String(form.bio || '').trim().slice(0, 160) || undefined,
    website: String(form.website || '').trim() || undefined,
  };
}

export function buildCreatorPrivateBody(form) {
  const gender = mapGenderToApi(form.gender);
  const phoneNumber = normalizePhoneForApi(form.phone);
  return {
    email: form.email?.trim() || undefined,
    phoneNumber,
    countryCode: phoneNumber ? '+91' : undefined,
    gender,
  };
}

/** Prefill designer wizard from API profile. */
export function hydrateDesignerForm(profile, base) {
  if (!profile) return base;
  const skills =
    Array.isArray(profile.designerSkills) && profile.designerSkills.length
      ? profile.designerSkills.map((s) => ({
          id: uid(),
          name: s.name || '',
          level: Number(s.proficiency) || 0,
        }))
      : base.skills;

  const experience =
    Array.isArray(profile.designerWorkExperience) && profile.designerWorkExperience.length
      ? profile.designerWorkExperience.map((r) => ({
          id: uid(),
          jobTitle: r.title || '',
          company: r.company || '',
          startYear: String(r.startDate || '').slice(0, 4),
          endYear: r.isPresent ? 'Present' : String(r.endDate || '').slice(0, 4),
          description: r.description || '',
        }))
      : base.experience;

  const education =
    Array.isArray(profile.designerEducation) && profile.designerEducation.length
      ? profile.designerEducation.map((e) => ({
          id: uid(),
          degree: e.degree || '',
          institution: e.institution || '',
          field: e.fieldOfStudy || '',
          dateRange: [e.startDate, e.isPresent ? 'Present' : e.endDate]
            .filter(Boolean)
            .join(' - '),
          currentlyStudying: Boolean(e.isPresent),
        }))
      : base.education;

  const hubs = { ...base.hubs };
  const customLinks = [];
  for (const link of profile.designerSocialLinks || []) {
    if (!link?.platform) continue;
    if (link.platform === 'custom') {
      customLinks.push({
        id: uid(),
        title: link.label || '',
        url: link.url || '',
      });
      continue;
    }
    if (hubs[link.platform]) {
      hubs[link.platform] = {
        enabled: link.enabled !== false,
        url: link.url || hubs[link.platform].url,
      };
    }
  }

  return {
    ...base,
    fullName: profile.name || base.fullName,
    username: profile.username || base.username,
    location: profile.designerLocation || base.location,
    coverPreview: profile.designerCoverImage || base.coverPreview,
    profilePreview: profile.profileImage || base.profilePreview,
    skills,
    experience,
    education,
    bio: profile.designerBio || base.bio,
    tags: profile.designerTagline || base.tags,
    hubs,
    customLinks: customLinks.length ? customLinks : base.customLinks,
  };
}

/** Prefill creator wizard from API profile. */
export function hydrateCreatorForm(profile, base) {
  if (!profile) return base;
  return {
    ...base,
    photoPreview: profile.profileImage || base.photoPreview,
    fullName: profile.name || base.fullName,
    username: profile.username || base.username,
    bio: profile.creatorBio || base.bio,
    website: profile.creatorWebsite || base.website,
    email: profile.email || base.email,
    phone: profile.phoneNumber || base.phone,
    gender: mapGenderFromApi(profile.gender) || base.gender,
  };
}
