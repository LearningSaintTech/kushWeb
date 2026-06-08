import { useState } from 'react'

import { Link } from 'react-router-dom'

import { Mail, Home } from 'lucide-react'

import { contactUsService } from '../../services'

import { ROUTES } from '../../utils/constants'

import { CONTACT_LIMITS, validateContactForm } from '../../utils/validators'



function FormField({

  id,

  label,

  required,

  showRequiredMark = true,

  type = 'text',

  as = 'input',

  value,

  onChange,

  onBlur,

  rows,

  error,

  maxLength,

  inputMode,

  autoComplete,

}) {

  const Tag = as

  const errorId = error ? `${id}-error` : undefined

  return (

    <div className="relative">

      <Tag

        id={id}

        name={id}

        type={as === 'input' ? type : undefined}

        rows={as === 'textarea' ? rows : undefined}

        required={required}

        value={value}

        onChange={onChange}

        onBlur={onBlur}

        maxLength={maxLength}

        inputMode={inputMode}

        autoComplete={autoComplete}

        aria-invalid={error ? true : undefined}

        aria-describedby={errorId}

        className={`peer w-full rounded-lg border bg-white px-4 text-sm text-black outline-none transition focus:border-black ${error ? 'border-red-500 focus:border-red-600' : 'border-gray-200'

          } ${as === 'textarea' ? 'min-h-[140px] resize-none pt-7 pb-3' : 'h-14 pt-6 pb-2'

          }`}

      />

      <label

        htmlFor={id}

        className="pointer-events-none absolute left-4 top-2 text-xs text-gray-500"

      >

        {label}

        {required && showRequiredMark && <span className="text-red-500"> *</span>}

      </label>

      {error && (

        <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">

          {error}

        </p>

      )}

    </div>

  )

}



const EMPTY_FORM = { name: '', phone: '', email: '', message: '' }



export default function ContactUsPage() {

  const [form, setForm] = useState(EMPTY_FORM)

  const [fieldErrors, setFieldErrors] = useState({})

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [status, setStatus] = useState(null)



  const handleChange = (e) => {

    const { name, value } = e.target

    setForm((prev) => ({ ...prev, [name]: value }))

    if (fieldErrors[name]) {

      setFieldErrors((prev) => {

        const next = { ...prev }

        delete next[name]

        return next

      })

    }

    if (status) setStatus(null)

  }



  const handleBlur = (e) => {

    const { name } = e.target

    const result = validateContactForm(form, { phoneRequired: true })

    if (result.errors[name]) {

      setFieldErrors((prev) => ({ ...prev, [name]: result.errors[name] }))

    }

  }



  const handleSubmit = async (e) => {

    e.preventDefault()

    const result = validateContactForm(form, { phoneRequired: true })

    if (!result.valid) {

      setFieldErrors(result.errors)

      setStatus({ type: 'error', text: 'Please fix the errors below.' })

      return

    }



    const { name, email, phone, message } = result.values



    try {

      setIsSubmitting(true)

      setStatus(null)

      setFieldErrors({})

      await contactUsService.submit({

        name,

        email,

        phone,

        message,

      })

      setForm(EMPTY_FORM)

      setStatus({

        type: 'success',

        text: 'Thank you! We received your message and will respond within 24–48 hours.',

      })

    } catch (err) {

      console.error('Failed to submit contact-us request', err)

      setStatus({

        type: 'error',

        text:

          err?.message ||

          'Something went wrong. Please try again or email us directly.',

      })

    } finally {

      setIsSubmitting(false)

    }

  }



  return (

    <div className="min-h-screen bg-white text-black pt-24 pb-16 font-inter">

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <Link

          to={ROUTES.HOME}

          className="mb-8 inline-block text-sm uppercase tracking-wider text-gray-500 hover:text-black"

        >

          ← Back to home

        </Link>



        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">

          {/* Left column */}

          <div className="space-y-6 lg:space-y-8">

            <h1 className="text-3xl w-[50vh] font-raleway font-bold  uppercase  text-[#000000] sm:text-3xl lg:text-5xl">

              Get in Touch with KHUSH

            </h1>



            <div className="space-y-4">

              <h2 className="text-lg font-semibold text-black sm:text-xl">

                We&apos;re Here To Help!

              </h2>

              <p className="max-w-md text-sm leading-relaxed text-gray-800 sm:text-base">

                We aim to respond within 24-48 hours. Whether it&apos;s a question about our

                collections or a request to delete your account, your message matters to us.

              </p>

            </div>



            <div className="space-y-5 pt-2">

              <div className="flex items-start gap-3">

                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-black" strokeWidth={1.5} />

                <a

                  href="mailto:support@khushpehno.com"

                  className="text-sm text-black underline underline-offset-2 hover:no-underline sm:text-base"

                >

                  support@khushpehno.com

                </a>

              </div>



              <div className="flex items-start gap-3">

                <Home className="mt-0.5 h-5 w-5 shrink-0 text-black" strokeWidth={1.5} />

                <p className="text-sm leading-relaxed text-gray-800 sm:text-base">

                  <span className="font-medium text-black">Address: </span>

                  B-127, B Block, Sector 69, Noida, Uttar Pradesh 201309

                </p>

              </div>

            </div>

          </div>



          {/* Right column — form */}

          <div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">

              <FormField

                id="name"

                label="Name"

                required

                value={form.name}

                onChange={handleChange}

                onBlur={handleBlur}

                error={fieldErrors.name}

                maxLength={CONTACT_LIMITS.nameMax}

                autoComplete="name"

              />

              <FormField

                id="phone"

                label="Phone Number"

                required

                type="tel"

                inputMode="tel"

                value={form.phone}

                onChange={handleChange}

                onBlur={handleBlur}

                error={fieldErrors.phone}

                maxLength={10}

                autoComplete="tel"

              />

              <FormField

                id="email"

                label="Email"

                type="email"

                required

                showRequiredMark={false}

                value={form.email}

                onChange={handleChange}

                onBlur={handleBlur}

                error={fieldErrors.email}

                maxLength={CONTACT_LIMITS.emailMax}

                autoComplete="email"

              />

              <FormField

                id="message"

                label="Message"

                as="textarea"

                rows={5}

                required

                showRequiredMark={false}

                value={form.message}

                onChange={handleChange}

                onBlur={handleBlur}

                error={fieldErrors.message}

                maxLength={CONTACT_LIMITS.messageMax}

              />



              {status && (

                <p

                  className={`text-sm ${status.type === 'success' ? 'text-green-700' : 'text-red-600'

                    }`}

                  role="alert"

                >

                  {status.text}

                </p>

              )}



              <button

                type="submit"

                disabled={isSubmitting}

                className="h-12 w-full rounded-lg bg-black text-sm font-normal text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:text-base"

              >

                {isSubmitting ? 'Submitting…' : 'Submit'}

              </button>

            </form>

          </div>

        </div>

      </div>

    </div>

  )

}


