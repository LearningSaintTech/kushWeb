import React from 'react'
import { Link } from 'react-router-dom'
import { IoChevronForward } from 'react-icons/io5'

import leftImage from '../../../assets/temporary/couples.png'
import rightImage from '../../../assets/temporary/couples.png'

const Couples = ({ section }) => {
    const exploreTo = section?._id && section?.type === 'MANUAL' ? `/section/${section._id}` : '/search?category=couple'
    const title = section?.title || 'Couples'
    return (
        <section className="relative py-20  overflow-hidden">
            <div className="relative mx-90">

                <div className="grid grid-cols-1 lg:grid-cols-2   items-center relative">

                    {/* LEFT IMAGE */}
                    <div className="relative ">
                        <img
                            src={leftImage}
                            alt="Couples collection"
                            className="w-[30vw] h-[42vw] object-cover"
                        />
                    </div>

                    {/* RIGHT IMAGE */}
                    <div className="relative ">
                        <img
                            src={rightImage}
                            alt="Couples collection"
                            className="w-[30vw] h-[42vw] object-cover "
                        />

                        {/* EXPLORE */}
                        <Link
                            to={exploreTo}
                            className="absolute top-[25vw] right-[-14vw] flex flex-col items-center group z-20"
                        >
                            <span className="text-sm tracking-[0.25em] uppercase font-light flex items-center gap-1 group-hover:opacity-70 transition">
                                Explore
                                <IoChevronForward />
                            </span>
                            <div className="w-30 h-px bg-black mt-2"></div>
                        </Link>
                    </div>

                    {/* OVERLAPPING TEXT (LEFT SIDE BIG TEXT) */}
                    <div className="hidden lg:block absolute left-[-15vw] top-16 z-30">

                        <div className="flex items-center gap-4">
                            <p className="text-sm tracking-[0.25em] uppercase font-semibold" >
                                {title}
                            </p>
                            <div className="w-[15vw] h-px bg-black"></div>
                        </div>

                        <h2 className="text-[8vw] leading-none font-extrabold uppercase mt-2" style={{ fontFamily: 'Impact' }}>
                            {title}
                        </h2>

                        <div className="flex   justify-start items-center gap-4 mt-4">
                            <div className="w-[8vw] h-px bg-black"></div>
                            <span className="text-sm tracking-[0.25em] uppercase font-semibold" >
                                Collection
                            </span>
                        </div>

                    </div>

                    {/* OVERLAPPING COLLECTION RIGHT */}
                    <div className="hidden lg:block absolute bottom-20 right-[-16vw] z-30 text-right">
                        <h2 className="text-[8vw] leading-none font-extrabold uppercase" style={{ fontFamily: 'Impact' }}>

                            <span
                                className="text-transparent"
                                style={{ WebkitTextStroke: '0.001vw white' }}
                                >
                                COLLE
                            </span>

                            <span>CTION</span>

                        </h2>
                    </div>

                </div>
            </div>
        </section>
    )
}

export default Couples