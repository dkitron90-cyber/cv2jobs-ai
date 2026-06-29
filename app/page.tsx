import HomePage from "../components/HomePage";

type PageProps = {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export default async function Page({ params, searchParams }: PageProps) {
  await params;
  await searchParams;

  return <HomePage />;
}
