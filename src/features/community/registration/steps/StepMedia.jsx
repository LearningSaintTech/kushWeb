import { useRef } from 'react'

function CameraIcon() {
  return (
    <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.641-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  )
}

function pickFile(inputRef) {
  inputRef.current?.click()
}

function handleFile(file, onPicked) {
  if (!file || !file.type.startsWith('image/')) return
  const preview = URL.createObjectURL(file)
  onPicked({ file, preview })
}

export default function StepMedia({ data, onChange }) {
  const coverRef = useRef(null)
  const profileRef = useRef(null)

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        type="button"
        onClick={() => pickFile(coverRef)}
        className="relative flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-white/20 bg-[#1e1e1e] transition hover:border-white/35"
      >
        {data.coverPreview ? (
          <img src={data.coverPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <CameraIcon />
            <span className="font-inter text-sm text-white/50">Upload Cover Image</span>
          </>
        )}
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            handleFile(file, ({ file: f, preview }) => {
              if (data.coverPreview) URL.revokeObjectURL(data.coverPreview)
              onChange({ coverImage: f, coverPreview: preview })
            })
          }}
        />
      </button>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => pickFile(profileRef)}
          className="relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border  border-white/20 bg-black transition hover:border-white/35"
        >
          {data.profilePreview ? (
            <img src={data.profilePreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <CameraIcon />
          )}
          <input
            ref={profileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              handleFile(file, ({ file: f, preview }) => {
                if (data.profilePreview) URL.revokeObjectURL(data.profilePreview)
                onChange({ profilePhoto: f, profilePreview: preview })
              })
            }}
          />
        </button>
        <span className="font-inter text-sm text-white/50">Upload Profile Photo</span>
      </div>
    </div>
  )
}
