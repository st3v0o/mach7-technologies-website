export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground font-mono text-sm">Last Updated: September 12, 2026</p>
      </div>

      <div className="prose prose-invert prose-red max-w-none">
        <p>
          This Privacy Policy describes how MACH 7 Technologies LLC ("we", "us", or "our") handles information when you use our mobile application, website, and related services (collectively, the "Service"). We are committed to being transparent about our data practices.
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Location Data:</strong> The Service accesses your device's GPS to attach geographic coordinates, heading, and speed to captured media. This data is stored on your device. It is transmitted to us only if you choose to publish a session to the Atlas portal.
          </li>
          <li>
            <strong>Media Files:</strong> Photos and video you capture using the Service are stored locally on your device. We do not have access to them unless you explicitly upload them by publishing a session to the Atlas portal.
          </li>
          <li>
            <strong>Account Information:</strong> Creating an account is optional; the Service's core capture, review, and export features work without one. If you do create an account — with an email address and password, or by signing in with Google or Apple — we store your email address and an associated username in order to identify your uploads and let you sign back in. If you sign in with Google or Apple, we receive your email address from that provider; we never receive your password.
          </li>
          <li>
            <strong>Purchase Information:</strong> If you subscribe to a Geospector Cloud plan, the purchase is processed by Apple; we never receive your payment card details. We use RevenueCat, a subscription-management service, to confirm your subscription status. RevenueCat receives your account's user ID along with the purchase record Apple provides (such as the product, purchase date, and renewal status), and we store that status so your storage allowance matches your plan.
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
          By default, all media and location data captured by the Service is stored locally on your device, and nothing is transmitted to us.
        </p>
        <p>
          If you publish a session to the Atlas portal, the frames you publish and their associated GPS coordinates, timestamps, heading, and speed are uploaded to and stored on infrastructure we operate. You choose what to publish and when; nothing is uploaded automatically.
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
        <p>
          <strong>Geospector Cloud retention:</strong> If your Geospector Cloud subscription ends, the content you uploaded to it is permanently deleted 90 days later unless you resubscribe. If you move to a plan whose storage allowance is smaller than what you have stored and remain over it for 90 days, your oldest Geospector Cloud sessions are deleted until you are within the allowance. The app shows the scheduled deletion date in advance.
        </p>
        <p>
          <strong>Deleting your account:</strong> You can permanently delete your account from inside the app, at Settings → Profile → Delete account. This immediately and permanently deletes your account together with every session, frame, and media file you have uploaded to the Atlas portal. It cannot be undone. Captures stored only on your device are unaffected and remain on your device. You may also request deletion by contacting us at the address below.
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
