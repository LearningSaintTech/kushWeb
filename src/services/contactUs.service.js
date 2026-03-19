import apiClient from "./axiosClient.js";

export const contactUsService = {
  /**
   * Submit a contact-us message
   * @param {{ name: string, email: string, phone?: string, subject?: string, message: string }} payload
   */
  submit(payload) {
    return apiClient.post("/contact-us/create", payload);
  },
};

