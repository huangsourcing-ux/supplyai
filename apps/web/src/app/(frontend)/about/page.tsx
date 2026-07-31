import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buildPublicPageMetadata } from "@/seo/metadata";

import styles from "./about-page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("About.metadata");

  return buildPublicPageMetadata({
    description: translate("description"),
    path: "/about",
    title: translate("title"),
  });
}

export default async function AboutPage() {
  const [company, translate] = await Promise.all([
    getTranslations("Legal.shared.company"),
    getTranslations("About"),
  ]);
  const journeySteps = ["search", "discover", "review", "visit"] as const;
  const principles = ["geography", "transparency", "independence"] as const;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{translate("eyebrow")}</p>
          <h1>{translate("title")}</h1>
          <p className={styles.lede}>{translate("description")}</p>
          <nav aria-label={translate("eyebrow")} className={styles.actions}>
            <Link className={styles.primaryAction} href="/">
              {translate("actions.map")}
            </Link>
            <Link className={styles.secondaryAction} href="/guides">
              {translate("actions.guides")}
            </Link>
          </nav>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{translate("mission.eyebrow")}</p>
            <h2>{translate("mission.title")}</h2>
            <p>{translate("mission.description")}</p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{translate("journey.eyebrow")}</p>
            <h2>{translate("journey.title")}</h2>
          </div>
          <ol className={styles.journey}>
            {journeySteps.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true" className={styles.stepNumber}>
                  {index + 1}
                </span>
                <h3>{translate(`journey.steps.${step}.title`)}</h3>
                <p>{translate(`journey.steps.${step}.description`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{translate("principles.eyebrow")}</p>
            <h2>{translate("principles.title")}</h2>
          </div>
          <ul className={styles.principles}>
            {principles.map((principle) => (
              <li key={principle}>
                <h3>{translate(`principles.${principle}.title`)}</h3>
                <p>{translate(`principles.${principle}.description`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-labelledby="about-contact" className={styles.contact}>
          <div>
            <p className={styles.eyebrow}>{translate("contact.eyebrow")}</p>
            <h2 id="about-contact">{translate("contact.title")}</h2>
            <p>{translate("contact.description")}</p>
          </div>
          <address>
            <strong>{company("name")}</strong>
            <span>
              {translate("contact.companyNumber", {
                number: company("number"),
              })}
            </span>
            <span>{company("registration")}</span>
            <span>{company("address")}</span>
            <a
              className={styles.contactAction}
              href={`mailto:${company("email")}`}
            >
              {translate("contact.emailAction")}
            </a>
          </address>
        </aside>
      </div>
    </main>
  );
}
