/**
 * Community profile API – creator / designer onboarding + username.
 * Base path: /user/community-profile
 * Requires: user auth (Bearer via axiosClient)
 *
 * Dev logs: filtered with `[CommunityProfile]` when VITE_APP_ENV=dev.
 */

import client from './axiosClient.js';
import { debugLog, debugError } from '../utils/debugLog.js';
import { redactForLog } from '../utils/logRedact.util.js';

const BASE = '/user/community-profile';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function logCommunity(label, payload) {
  debugLog(`[CommunityProfile] ${label}`, payload);
}

function wrap(method, path, promise, body) {
  logCommunity('request', {
    method,
    path,
    body: body != null ? redactForLog(body) : undefined,
  });
  return promise
    .then((res) => {
      const data = unwrap(res);
      logCommunity('response', {
        method,
        path,
        message: res?.data?.message,
        data: redactForLog(data),
      });
      return data;
    })
    .catch((err) => {
      debugError(`[CommunityProfile] error`, {
        method,
        path,
        status: err?.response?.status,
        message: err?.response?.data?.message ?? err?.message,
        errors: err?.response?.data?.errors ?? null,
      });
      throw err;
    });
}

/** Prefer API message (+ express-validator errors) for UI alerts. */
export function getCommunityProfileErrorMessage(err, fallback = 'Something went wrong.') {
  const data = err?.response?.data;
  const errors = data?.errors;
  if (Array.isArray(errors) && errors.length) {
    const parts = errors
      .map((e) => {
        if (typeof e === 'string') return e.trim();
        if (e?.msg) return String(e.msg).trim();
        if (e?.message) return String(e.message).trim();
        return '';
      })
      .filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const parts = Object.values(errors)
      .flat()
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }
  const msg = data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  if (typeof err?.message === 'string' && err.message.trim()) return err.message.trim();
  return fallback;
}

export const communityProfileService = {
  /** GET /user/community-profile/ */
  getProfile: () => wrap('GET', `${BASE}/`, client.get(`${BASE}/`)),

  /** POST /user/community-profile/role — { role: 'creator' | 'designer' } */
  selectRole: (role) =>
    wrap('POST', `${BASE}/role`, client.post(`${BASE}/role`, { role }), { role }),

  /** GET /user/community-profile/username/check?username= */
  checkUsername: (username) =>
    wrap(
      'GET',
      `${BASE}/username/check`,
      client.get(`${BASE}/username/check`, { params: { username } }),
      { username },
    ),

  /** PATCH /user/community-profile/username */
  updateUsername: (username) =>
    wrap(
      'PATCH',
      `${BASE}/username`,
      client.patch(`${BASE}/username`, { username }),
      { username },
    ),

  // ——— Designer ———

  patchDesignerEssentials: (body) =>
    wrap(
      'PATCH',
      `${BASE}/designer/essentials`,
      client.patch(`${BASE}/designer/essentials`, body),
      body,
    ),

  /** multipart: profileImage?, coverImage? — reject empty FormData (avoids 400 validation). */
  patchDesignerScene: (formData) => {
    if (typeof FormData !== 'undefined' && formData instanceof FormData) {
      let hasEntry = false;
      for (const _ of formData.keys()) {
        hasEntry = true;
        break;
      }
      if (!hasEntry) {
        return Promise.reject(
          Object.assign(new Error('Add a profile or cover image to continue.'), {
            response: { data: { message: 'Add a profile or cover image to continue.' } },
          }),
        );
      }
    }
    return wrap(
      'PATCH',
      `${BASE}/designer/scene`,
      client.patch(`${BASE}/designer/scene`, formData),
      formData,
    );
  },

  patchDesignerSkills: (skills) =>
    wrap(
      'PATCH',
      `${BASE}/designer/skills`,
      client.patch(`${BASE}/designer/skills`, { skills }),
      { skills },
    ),

  patchDesignerExperience: (experience) =>
    wrap(
      'PATCH',
      `${BASE}/designer/experience`,
      client.patch(`${BASE}/designer/experience`, { experience }),
      { experience },
    ),

  patchDesignerEducation: (education) =>
    wrap(
      'PATCH',
      `${BASE}/designer/education`,
      client.patch(`${BASE}/designer/education`, { education }),
      { education },
    ),

  patchDesignerStory: (body) =>
    wrap(
      'PATCH',
      `${BASE}/designer/story`,
      client.patch(`${BASE}/designer/story`, body),
      body,
    ),

  patchDesignerLinks: (links) =>
    wrap(
      'PATCH',
      `${BASE}/designer/links`,
      client.patch(`${BASE}/designer/links`, { links }),
      { links },
    ),

  skipDesignerStep: () =>
    wrap('POST', `${BASE}/designer/skip`, client.post(`${BASE}/designer/skip`)),

  completeDesigner: () =>
    wrap('POST', `${BASE}/designer/complete`, client.post(`${BASE}/designer/complete`)),

  resubmitDesigner: () =>
    wrap('POST', `${BASE}/designer/resubmit`, client.post(`${BASE}/designer/resubmit`)),

  // ——— Creator ———

  /** multipart: profileImage (required) */
  patchCreatorPhoto: (formData) => {
    const file =
      typeof FormData !== 'undefined' && formData instanceof FormData
        ? formData.get('profileImage')
        : null;
    if (!(file instanceof File)) {
      return Promise.reject(
        Object.assign(new Error('Profile photo is required.'), {
          response: { data: { message: 'Profile photo is required.' } },
        }),
      );
    }
    return wrap(
      'PATCH',
      `${BASE}/creator/photo`,
      client.patch(`${BASE}/creator/photo`, formData),
      formData,
    );
  },

  patchCreatorBasic: (body) =>
    wrap(
      'PATCH',
      `${BASE}/creator/basic`,
      client.patch(`${BASE}/creator/basic`, body),
      body,
    ),

  patchCreatorAbout: (body) =>
    wrap(
      'PATCH',
      `${BASE}/creator/about`,
      client.patch(`${BASE}/creator/about`, body),
      body,
    ),

  patchCreatorPrivate: (body) =>
    wrap(
      'PATCH',
      `${BASE}/creator/private`,
      client.patch(`${BASE}/creator/private`, body),
      body,
    ),

  skipCreatorStep: () =>
    wrap('POST', `${BASE}/creator/skip`, client.post(`${BASE}/creator/skip`)),

  completeCreator: () =>
    wrap('POST', `${BASE}/creator/complete`, client.post(`${BASE}/creator/complete`)),
};

export {
  DESIGNER_STEP_TO_INDEX,
  CREATOR_STEP_TO_INDEX,
  designerStepIndex,
  creatorStepIndex,
  mapGenderToApi,
  mapGenderFromApi,
  normalizePhoneForApi,
  buildDesignerEssentialsBody,
  buildDesignerSceneFormData,
  buildDesignerSkillsBody,
  buildDesignerExperienceBody,
  buildDesignerEducationBody,
  buildDesignerStoryBody,
  buildDesignerLinksBody,
  buildCreatorPhotoFormData,
  buildCreatorBasicBody,
  buildCreatorAboutBody,
  buildCreatorPrivateBody,
  hydrateDesignerForm,
  hydrateCreatorForm,
  isCommunityProfileDeleted,
  mapDeletedCommunityProfileResponse,
} from './communityProfile.mappers.js';
