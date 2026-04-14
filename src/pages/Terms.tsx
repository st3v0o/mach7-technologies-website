export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold mb-4">Terms of Use</h1>
        <p className="text-muted-foreground font-mono text-sm">Last Updated: April 14, 2026</p>
      </div>

      <div className="prose prose-invert prose-orange max-w-none">
        <p>
          These Terms of Use govern your access to and use of the software and services provided by MACH 7 Technologies LLC ("we", "us", or "our"), including the mobile application and any associated services (collectively, the "Service"). By downloading, installing, or using the Service, you agree to be bound by these Terms.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Service, you confirm that you are at least 18 years of age, have read and understood these Terms, and agree to be bound by them. If you do not agree with any part of these Terms, you must not use the Service.
        </p>

        <h2>2. License and Restrictions</h2>
        <p>
          Subject to your compliance with these Terms, MACH 7 Technologies LLC grants you a limited, non-exclusive, non-transferable, revocable license to use the Service for your personal or internal business purposes.
        </p>
        <p>You agree not to:</p>
        <ul>
          <li>Copy, modify, distribute, sell, or lease any part of the Service;</li>
          <li>Reverse engineer or attempt to extract the source code of the Service;</li>
          <li>Use the Service for any unlawful purpose or in violation of any applicable laws or regulations;</li>
          <li>Use the Service to capture media or location data on private property without appropriate authorization;</li>
          <li>Interfere with or disrupt the integrity or performance of the Service.</li>
        </ul>

        <h2>3. User-Generated Content</h2>
        <p>
          All media (video, photos) and location data you capture using the Service remain your sole property. We do not claim any ownership rights over the content you create. You are solely responsible for ensuring that you have all necessary rights, permissions, and authorizations to capture media and location data in the locations where you use the Service.
        </p>
        <p>
          Content captured with the Service is stored locally on your device by default. If you enable optional cloud upload features, your content will be transmitted to the cloud storage provider of your choice. You are responsible for reviewing and complying with the terms and privacy policies of any third-party cloud services you connect.
        </p>

        <h2>4. Location Data</h2>
        <p>
          The Service requires access to your device's location services to function. Location data is used solely to tag your captured media with geographic coordinates. This data is stored locally on your device and is not transmitted to MACH 7 Technologies LLC unless you explicitly choose to upload it through a connected cloud service. You may disable location access at any time through your device settings, though doing so will prevent core functionality.
        </p>

        <h2>5. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
        </p>

        <h2>6. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MACH 7 TECHNOLOGIES LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS, OR LOSS OF GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>

        <h2>7. Changes to These Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will notify you of material changes by updating the "Last Updated" date at the top of this page. Your continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.
        </p>

        <h2>8. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have questions about these Terms, please contact us at:{" "}
          <a href="mailto:info@mach7technologies.com" className="text-primary hover:underline">info@mach7technologies.com</a>
        </p>
      </div>
    </div>
  );
}
