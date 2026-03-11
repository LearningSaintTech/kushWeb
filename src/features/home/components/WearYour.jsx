import React from "react";
import promoImage from "../../../assets/temporary/wear.svg";

export default function HomePromo() {
  return (
    <section className=" py-20 flex justify-center">
      <div className="max-w-[1100px] w-full px-4">
        
        <div className="rounded-2xl overflow-hidden">
          <img
            src={promoImage}
            alt="Promo Banner"
            className="w-full h-auto object-cover"
          />
        </div>

      </div>
    </section>
  );
}