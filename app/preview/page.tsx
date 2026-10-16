import { Portal } from "../../components/portal";
import { demoData } from "../../lib/demo";
export const metadata = {
  title: "Sample client portal",
  robots: { index: false, follow: false },
};
export default function Preview() {
  return <Portal data={demoData} demo />;
}
