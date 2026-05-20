import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import AboutTeaser from "@/components/home/AboutTeaser";
import WorkshopsTeaser from "@/components/home/WorkshopsTeaser";
import InstagramCta from "@/components/home/InstagramCta";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <FeaturedProducts />
        <AboutTeaser />
        <WorkshopsTeaser />
        <InstagramCta />
      </main>
      <Footer />
    </>
  );
}
