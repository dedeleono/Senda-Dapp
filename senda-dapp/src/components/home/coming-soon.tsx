'use client'
import React from 'react'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import Image from 'next/image'
import Android from '@/public/iOS-A.png'
import Box from '@/public/box.jpg'
import Phone from '@/public/phone.jpg'

const settings = {
  dots: false,
  infinite: true,
  slidesToShow: 2,
  slidesToScroll: 1,
  arrows: true,
  autoplay: false,
  speed: 500,
  cssEase: 'linear',
  responsive: [
    {
      breakpoint: 800,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
        infinite: true,
        dots: false,
        arrows: false,
      },
    },
  ],
}

const postData: { heading: string; imgSrc: string }[] = [
  {
    heading: 'Off-ramp using pre-paid debit cards',
    imgSrc: Phone.src,
  },
  {
    heading: 'Android and iOS App',
    imgSrc: Android.src,
  },
  {
    heading: 'ACH off-ramp to your bank account',
    imgSrc: Box.src,
  },
]

const ComingSoon = () => {
  return (
    <section className="relative bg-deepSlate dark:bg-darkmode">
      <div className="container mx-auto lg:max-w-(--breakpoint-xl) md:max-w-(--breakpoint-md) relative px-4 sm:px-6">
        <div className="text-center mt-12 sm:mt-24">
          <h3 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-black my-2">Coming soon.</h3>
          <h3 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-black/50 lg:mr-48 my-2">
            Coming soon.
          </h3>
          <h3 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-black/25 lg:-mr-32 my-2">
            Coming soon.
          </h3>
        </div>

        <Slider {...settings}>
          {postData.map((items, i) => (
            <div key={i}>
              <div className="bg-transparent m-3 rounded-3xl h-[600px] sm:h-[800px] flex flex-col">
                <div className="relative w-full h-[420px] sm:h-[620px]">
                  <Image 
                    src={items.imgSrc} 
                    alt={items.heading} 
                    fill
                    className="rounded-2xl object-cover"
                  />
                </div>
                <div className="w-full mt-4 sm:mt-8">
                  <h4 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center sm:text-start text-black px-2">{items.heading}</h4>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  )
}
export default ComingSoon
