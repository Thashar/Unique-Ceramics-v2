import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import CustomOrderForm from "@/components/custom-order/CustomOrderForm";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export default async function CustomOrderPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[{ name: "Zamówienie indywidualne", path: "/zamowienie-indywidualne" }]}
      />
      <Header />
      <CustomOrderForm topOffset />
      <Footer />
    </>
  );
}
