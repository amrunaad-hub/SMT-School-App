const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

const ATTACHMENTS = [
    {
        id: 'science-video-link.txt',
        fileName: 'science-video-link.txt',
        mimeType: 'text/plain; charset=utf-8',
        title: 'Science Video Link',
        content: 'Science video activity: Eating habits of animals.\nWatch link: https://example.com/science-video\n',
    },
    {
        id: 'hindi-notes.pdf',
        fileName: 'hindi-notes.pdf',
        mimeType: 'application/pdf',
        title: 'Hindi Notes',
        content: 'Hindi notes summary for class reference.\nChapter: Bhasha aur Lipi.\n',
    },
    {
        id: 'ict-practice-sheet.docx',
        fileName: 'ict-practice-sheet.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        title: 'ICT Practice Sheet',
        content: 'ICT practice worksheet with basic questions and lab instructions.\n',
    },
    {
        id: 'hindi-notebook-notes.pdf',
        fileName: 'hindi-notebook-notes.pdf',
        mimeType: 'application/pdf',
        title: 'Hindi Notebook Notes',
        content: 'Notebook exercise instructions for Hindi language class.\n',
    },
    {
        id: 'dictation-list.docx',
        fileName: 'dictation-list.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        title: 'Dictation List',
        content: 'List of dictation words for weekly revision.\n',
    },
    {
        id: 'ptm-circular.pdf',
        fileName: 'ptm-circular.pdf',
        mimeType: 'application/pdf',
        title: 'PTM Circular',
        content: 'Parent-Teacher Meeting circular details and schedule.\n',
    },
    {
        id: 'transport-guidelines.pdf',
        fileName: 'transport-guidelines.pdf',
        mimeType: 'application/pdf',
        title: 'Transport Guidelines',
        content: 'Transport and dispersal instructions for parents.\n',
    },
    {
        id: 'healthy-tiffin-circular.pdf',
        fileName: 'healthy-tiffin-circular.pdf',
        mimeType: 'application/pdf',
        title: 'Healthy Tiffin Circular',
        content: 'Healthy tiffin and birthday guidelines notice.\n',
    },
];

const toPayload = (req, attachment) => {
    const encoded = encodeURIComponent(attachment.id);
    const forwardedProto = req.get('x-forwarded-proto');
    const protocol = forwardedProto || req.protocol;
    const base = `${protocol}://${req.get('host')}`;

    return {
        id: attachment.id,
        fileName: attachment.fileName,
        title: attachment.title,
        previewUrl: `${base}/api/attachments/${encoded}/preview`,
        downloadUrl: `${base}/api/attachments/${encoded}/download`,
    };
};

const findAttachment = (id) => ATTACHMENTS.find((attachment) => attachment.id === id);

router.use(auth);
router.use(authorize(['admin', 'parent', 'teacher']));

router.get('/', (req, res) => {
    const ids = (req.query.ids || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

    const filtered = ids.length
        ? ATTACHMENTS.filter((attachment) => ids.includes(attachment.id))
        : ATTACHMENTS;

    res.json({
        attachments: filtered.map((attachment) => toPayload(req, attachment)),
    });
});

router.get('/:id/preview', (req, res) => {
    const id = decodeURIComponent(req.params.id);
    const attachment = findAttachment(id);

    if (!attachment) {
        return res.status(404).json({ message: 'Attachment not found' });
    }

    const safeContent = attachment.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${attachment.title}</title>
<style>
body { font-family: Arial, sans-serif; margin: 0; padding: 16px; background: #f8fafc; color: #0f172a; }
article { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
h1 { margin-top: 0; font-size: 1.2rem; }
pre { white-space: pre-wrap; word-break: break-word; line-height: 1.6; margin: 0; }
</style>
</head>
<body>
<article>
  <h1>${attachment.title}</h1>
  <pre>${safeContent}</pre>
</article>
</body>
</html>`);
});

router.get('/:id/download', (req, res) => {
    const id = decodeURIComponent(req.params.id);
    const attachment = findAttachment(id);

    if (!attachment) {
        return res.status(404).json({ message: 'Attachment not found' });
    }

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    return res.send(attachment.content);
});

module.exports = router;
