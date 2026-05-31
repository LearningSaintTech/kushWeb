import { Helmet } from "react-helmet-async";
import PolicyPageLayout from './PolicyPageLayout'

export default function AboutUsPage() {
  return (
    <>
      <Helmet>
        <title>
          About Khush Pehno | Trendy Fashion for Men & Women
        </title>

        <meta
          name="description"
          content="Learn more about Khush Pehno, your trusted online fashion destination for stylish and affordable clothing for men and women across India."
        />

        <meta
          name="keywords"
          content="about khush pehno, fashion brand india, online clothing store"
        />

        <meta property="og:type" content="website" />

        <meta
          property="og:title"
          content="About Khush Pehno | Fashion for Men & Women"
        />

        <meta
          property="og:description"
          content="Discover Khush Pehno, your trusted online fashion destination for stylish and affordable clothing for men and women across India."
        />
      </Helmet>

      <PolicyPageLayout title="About us">
        <p>
          KHUSH is a fashion and lifestyle brand offering curated apparel and accessories.
          We focus on quality, style, and a smooth shopping experience for our customers.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">
          Our story
        </h2>

        <p>
          We started with a simple idea: to make great design and comfort accessible.
          Today we serve customers across India with a wide range of products and reliable delivery.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">
          Our values
        </h2>

        <p>
          Quality, transparency, and customer satisfaction are at the heart of what we do.
          We work with trusted partners and processes to bring you products you can rely on.
        </p>

        <h2 className="text-lg font-semibold text-black mt-6">
          Contact
        </h2>

        <p>
          For any questions or feedback, visit our Contact Us page or reach out to the email
          and phone number provided on the website.
        </p>
      </PolicyPageLayout>
    </>
  )
}