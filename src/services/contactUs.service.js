import apiClient from "./axiosClient.js";

function getApiErrorMessage(err, fallback = "Failed to submit contact request") {
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

export const contactUsService = {
  /**
   * Submit a contact-us message (public endpoint).
   * @param {{ name: string, email: string, phone?: string, subject?: string, message: string }} payload
   */
  async submit(payload) {
    try {
      const res = await apiClient.post("/contact-us/create", payload);
      const body = res?.data;
      if (body?.success === false) {
        throw new Error(body.message || "Request failed");
      }
      return body?.data ?? body;
    } catch (err) {
      const message = getApiErrorMessage(err);
      const error = new Error(message);
      error.response = err.response;
      throw error;
    }
  },
};
