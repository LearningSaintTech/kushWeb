import homeVideo from '../../../assets/temporary/homeVideo.mp4'

const Banner = () => {
  return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-screen overflow-hidden">
      <video
        src={homeVideo}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
    </div>
  )
}

export default Banner
