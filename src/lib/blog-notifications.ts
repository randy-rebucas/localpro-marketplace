/**
 * Blog Comment Email Notifications
 * 
 * Handles sending emails to blog authors when:
 * - New comments are submitted (pending moderation)
 * - Comments are approved/rejected (for moderation workflow)
 */

import { Resend } from "resend";
import type { IBlog, PopulatedAuthor } from "@/models/Blog";
import type { BlogCommentDocument } from "@/models/BlogComment";
import { createLogger } from "@/lib/logger";

const log = createLogger("blog-notifications");

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = process.env.SMTP_FROM ?? "LocalPro <no-reply@localpro.app>";

/**
 * Send email to blog author when a new comment is pending moderation
 */
export async function sendCommentPendingApprovalEmail(
  blog: IBlog,
  comment: BlogCommentDocument,
  authorEmail: string
) {
  try {
    const author = blog.author as PopulatedAuthor;
    const authorName = typeof author === "object" ? author.name : "Author";
    const blogTitle = blog.title;
    const commenterName = comment.authorName || "Anonymous";
    const commentContent = comment.content?.substring(0, 200) || "No content";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Comment on Your Blog</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:24px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700">LocalPro</span>
            <span style="color:#93c5fd;font-size:13px;margin-left:8px">Blog</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600">New Comment Pending Review</h2>
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
              Hi ${escHtml(authorName)},
            </p>
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
              A new comment has been submitted on your blog post <strong>"${escHtml(blogTitle)}"</strong> and is waiting for your approval.
            </p>
            
            <!-- Comment Preview -->
            <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:16px;margin:20px 0;border-radius:4px">
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase">
                From: ${escHtml(commenterName)}
              </p>
              <p style="margin:0;color:#334155;font-size:14px;line-height:1.5;word-break:break-word">
                ${escHtml(commentContent)}${comment.content?.length! > 200 ? '...' : ''}
              </p>
            </div>

            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
              Review and approve/reject this comment in your blog management dashboard.
            </p>

            <!-- CTA -->
            <div style="margin-top:28px">
              <a href="${APP_URL}/admin/blogs?status=published" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
                Moderate Comments
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
            <p style="margin:0;color:#64748b;font-size:12px">
              You received this because someone commented on your blog post. 
              <a href="${APP_URL}/admin/blogs" style="color:#1e3a5f;text-decoration:none">Manage your blog</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    const result = await resend.emails.send({
      from: FROM,
      to: authorEmail,
      subject: `New Comment on "${blogTitle}"`,
      html: htmlContent,
    });

    if (result.error) {
      log.error({ error: result.error }, "Failed to send comment approval email");
      return false;
    }

    log.info({ blogId: blog._id, commentId: comment._id, to: authorEmail }, "Comment pending approval email sent");

    return true;
  } catch (error) {
    log.error({ error }, "Error sending comment approval email");
    return false;
  }
}

/**
 * Send email to commenter when their comment is approved
 */
export async function sendCommentApprovedEmail(
  blog: IBlog,
  comment: BlogCommentDocument,
  commenterEmail: string
) {
  try {
    const blogTitle = blog.title;
    const commenterName = comment.authorName || "Commenter";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Comment Was Approved</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr>
          <td style="background:#10b981;padding:24px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700">LocalPro</span>
            <span style="color:#d1fae5;font-size:13px;margin-left:8px">Blog</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600">Your Comment Was Approved! ✓</h2>
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
              Hi ${escHtml(commenterName)},
            </p>
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px">
              Your comment on <strong>"${escHtml(blogTitle)}"</strong> has been approved and is now visible to other readers.
            </p>

            <!-- CTA -->
            <div style="margin-top:28px">
              <a href="${APP_URL}/blog/${blog.slug}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
                View the Article
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
            <p style="margin:0;color:#64748b;font-size:12px">
              You received this because you commented on a LocalPro blog post.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    const result = await resend.emails.send({
      from: FROM,
      to: commenterEmail,
      subject: `Your Comment on "${blogTitle}" Was Approved`,
      html: htmlContent,
    });

    if (result.error) {
      log.error({ error: result.error }, "Failed to send comment approved email");
      return false;
    }

    log.info({ blogId: blog._id, commentId: comment._id, to: commenterEmail }, "Comment approved email sent");

    return true;
  } catch (error) {
    log.error({ error }, "Error sending comment approved email");
    return false;
  }
}

/**
 * Send email to commenter when their comment is rejected
 */
export async function sendCommentRejectedEmail(
  blog: IBlog,
  comment: BlogCommentDocument,
  commenterEmail: string,
  reason?: string
) {
  try {
    const blogTitle = blog.title;
    const commenterName = comment.authorName || "Commenter";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Comment Moderation Update</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr>
          <td style="background:#f59e0b;padding:24px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700">LocalPro</span>
            <span style="color:#fef3c7;font-size:13px;margin-left:8px">Blog</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600">Comment Moderation Update</h2>
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
              Hi ${escHtml(commenterName)},
            </p>
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px">
              Your comment on <strong>"${escHtml(blogTitle)}"</strong> did not meet our community guidelines and has not been published.
            </p>
            ${reason ? `
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px">
              <strong>Reason:</strong> ${escHtml(reason)}
            </p>
            ` : ''}

            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px">
              Please review our <a href="${APP_URL}/terms" style="color:#1e3a5f;text-decoration:underline">community guidelines</a> before submitting comments in the future.
            </p>

            <!-- CTA -->
            <div style="margin-top:28px">
              <a href="${APP_URL}/blog/${blog.slug}" style="display:inline-block;background:#64748b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
                Back to Article
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
            <p style="margin:0;color:#64748b;font-size:12px">
              You received this because you commented on a LocalPro blog post.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    const result = await resend.emails.send({
      from: FROM,
      to: commenterEmail,
      subject: `Comment Status Update on "${blogTitle}"`,
      html: htmlContent,
    });

    if (result.error) {
      log.error({ error: result.error }, "Failed to send comment rejected email");
      return false;
    }

    log.info({ blogId: blog._id, commentId: comment._id, to: commenterEmail }, "Comment rejected email sent");

    return true;
  } catch (error) {
    log.error({ error }, "Error sending comment rejected email");
    return false;
  }
}

/**
 * Escape HTML to prevent injection
 */
function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
