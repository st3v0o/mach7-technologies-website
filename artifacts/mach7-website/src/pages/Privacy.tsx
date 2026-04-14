export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground font-mono text-sm">Last Updated: April 14, 2026</p>
      </div>

      <div className="prose prose-invert prose-orange max-w-none">
        <p>
          This Privacy Policy describes how MACH 7 Technologies LLC ("we", "us", or "our") handles information when you use our mobile application, website, and related services (collectively, the "Service"). We are committed to being transparent about our data practices.
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Location Data:</strong> The Service accesses your device's GPS to attach geographic coordinates to captured media. This data is processed locally on your device and is not transmitted to us.
          </li>
          <li>
            <strong>Media Files:</strong> Photos and video you capture using the Service are stored locally on your device. We do not have access to these files unless you explicitly upload them to a connected cloud service.
          </li>
          <li>
            <strong>Contact Information:</strong> If you reach out to us via the contact form or directly by email, we collect your name, organization, and email address solely to respond to your inquiry.
          </li>
          <li>
            <strong>Device Information:</strong> We may collect basic, anonymous device and usage information (such as device type and OS version) to improve the Service. This information cannot be used to identify you personally.
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and improve the core functionality of the Service (GPS tagging of media);</li>
          <li>Respond to inquiries and support requests;</li>
          <li>Diagnose technical issues and improve app stability;</li>
          <li>Comply with legal obligations.</li>
        </ul>
        <p>
          We do not use your location data or captured media for advertising purposes. We do not sell your personal information to third parties.
        </p>

        <h2>3. Data Storage and Security</h2>
        <p>
          All media and location data captured by the Service is stored locally on your device by default. MACH 7 Technologies LLC does not maintain servers that store your captured content.
        </p>
        <p>
          If you choose to enable optional cloud upload features, your content will be transmitted directly to the cloud storage provider you configure (e.g., your own cloud account). We do not have access to that cloud storage unless you explicitly grant it. You are responsible for the security practices of any third-party services you connect.
        </p>
        <p>
          We implement reasonable technical measures to protect any information we do handle, including contact form submissions, against unauthorized access or disclosure.
        </p>

        <h2>4. Third-Party Services</h2>
        <p>
          The Service may integrate with third-party mapping or cloud services. These services have their own privacy policies, and we encourage you to review them. We are not responsible for the privacy practices of third-party services.
        </p>

        <h2>5. Children's Privacy</h2>
        <p>
          The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a minor, please contact us and we will promptly delete it.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have the right to access, correct, or delete personal information we hold about you. Since we store minimal personal information and your captured data remains on your device, most data control is exercised directly through your device settings. For any other requests, please contact us at the address below.
        </p>

        <h2>7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last Updated" date at the top of this page. Your continued use of the Service after changes are posted constitutes your acceptance of the revised Policy.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or our data practices, please contact us at:{" "}
          <a href="mailto:info@mach7technologies.com" className="text-primary hover:underline">info@mach7technologies.com</a>
        </p>
      </div>
    </div>
  );
}
