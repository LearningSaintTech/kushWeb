import PolicyPageLayout from './PolicyPageLayout'
import { Mail, MessageCircle } from "lucide-react"

export default function ContactUsPage() {
  return (
    <PolicyPageLayout title="Get in Touch with KHUSH">
      <div className="space-y-6">

        {/* Intro */}
        <p className="text-gray-700 text-base leading-relaxed">
          Have a question, feedback, or need help with your account or order? 
          <span className="font-medium text-black"> We’re here to help!</span>
        </p>

        {/* Email Section */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-sm transition">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-black" />
            <h2 className="text-lg font-semibold text-black">Email</h2>
          </div>
          <a
            href="mailto:support@khushpehno.com"
            className="text-black underline hover:no-underline break-all"
          >
            support@khushpehno.com
          </a>
        </div>

        {/* Contact Form */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-sm transition">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="w-5 h-5 text-black" />
            <h2 className="text-lg font-semibold text-black">Contact Form</h2>
          </div>
          <a
            href="https://khushpehno.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black underline hover:no-underline break-all"
          >
            https://khushpehno.com/contact
          </a>
        </div>

        {/* Support Info */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-2">
            Customer Support
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            We aim to respond within <span className="font-medium">24–48 hours</span>. 
            Whether it’s a question about our collections or a request to delete your account, 
            your message matters to us.
          </p>
        </div>

      </div>
    </PolicyPageLayout>
  )
}