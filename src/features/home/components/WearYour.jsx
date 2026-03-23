import React from "react";
import promoImage from "../../../assets/temporary/wear.svg";
import promo from "../../../assets/temporary/wearphn.svg";

export default function HomePromo() {
  return (
    <section className="py-10 sm:py-10 lg:py-10 flex justify-center">
      <div className="max-w-[1100px] w-full px-12">

        <div className="rounded-xl overflow-hidden">

          {/* Mobile Image */}
          <img
            src={promo}
            alt="Promo Banner Mobile"
            className="w-full h-auto object-cover block lg:hidden"
          />

          {/* Desktop Image */}
          <img
            src={promoImage}
            alt="Promo Banner Desktop"
            className="w-full h-full object-cover hidden lg:block"
          />

        </div>

      </div>
    </section>
  );
}