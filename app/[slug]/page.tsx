'use client'
import ChainGrid from "@/components/chain"

export default function IndexPage({ params }: { params: { slug: string } }) {
    return (
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
            <ChainGrid gameId={params.slug as string} />
        </section>
    )
}
