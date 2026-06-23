import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import CustomOrderForm from "@/components/custom-order/CustomOrderForm";

export default async function CustomOrderPage() {
  return (
    <>
      <Header />
      <CustomOrderForm topOffset />
      <Footer />
    </>
  );
}
