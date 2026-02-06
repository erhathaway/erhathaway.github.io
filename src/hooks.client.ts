// Global drag-and-drop handler for admin pages.
// Prevents the browser's default "open file in new tab" behavior
// and dispatches a custom event that page components can listen for.

if (typeof document !== 'undefined') {
	let dragOverTimer: ReturnType<typeof setTimeout>;

	document.addEventListener('dragover', (e) => {
		if (!window.location.pathname.startsWith('/admin')) return;

		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';

		window.dispatchEvent(new CustomEvent('admin-drag-active'));
		clearTimeout(dragOverTimer);
		dragOverTimer = setTimeout(() => {
			window.dispatchEvent(new CustomEvent('admin-drag-inactive'));
		}, 200);
	});

	document.addEventListener('paste', (e) => {
		if (!window.location.pathname.startsWith('/admin')) return;

		const items = e.clipboardData?.items;
		if (!items) return;

		const imageFiles: File[] = [];
		for (const item of Array.from(items)) {
			if (item.kind === 'file' && item.type.startsWith('image/')) {
				const f = item.getAsFile();
				if (f) imageFiles.push(f);
			}
		}

		if (imageFiles.length > 0) {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('admin-file-drop', { detail: { files: imageFiles } }));
		}
	});

	document.addEventListener('drop', (e) => {
		if (!window.location.pathname.startsWith('/admin')) return;

		e.preventDefault();
		clearTimeout(dragOverTimer);
		window.dispatchEvent(new CustomEvent('admin-drag-inactive'));

		// Collect image files from dataTransfer.files and dataTransfer.items
		const imageFiles: File[] = [];

		if (e.dataTransfer?.files) {
			for (const f of Array.from(e.dataTransfer.files)) {
				if (f.type.startsWith('image/')) imageFiles.push(f);
			}
		}

		if (imageFiles.length === 0 && e.dataTransfer?.items) {
			for (const item of Array.from(e.dataTransfer.items)) {
				if (item.kind === 'file' && item.type.startsWith('image/')) {
					const f = item.getAsFile();
					if (f) imageFiles.push(f);
				}
			}
		}

		// Case 1: Actual files (from Finder/desktop)
		if (imageFiles.length > 0) {
			window.dispatchEvent(new CustomEvent('admin-file-drop', { detail: { files: imageFiles } }));
			return;
		}

		// Case 2: Image dragged from another browser page — extract URL
		const uriList = e.dataTransfer?.getData('text/uri-list');
		const html = e.dataTransfer?.getData('text/html');
		const plain = e.dataTransfer?.getData('text/plain');

		let imageUrl: string | null = null;

		// Extract from uri-list
		if (uriList) {
			const url = uriList.split('\n').find((l) => l.trim() && !l.startsWith('#'));
			if (url) imageUrl = url.trim();
		}

		// Extract from <img src="..."> in HTML
		if (!imageUrl && html) {
			const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
			if (match?.[1]) imageUrl = match[1];
		}

		// Extract from plain text
		if (!imageUrl && plain) {
			const trimmed = plain.trim();
			if (/^https?:\/\/.+/i.test(trimmed)) {
				imageUrl = trimmed;
			}
		}

		if (imageUrl) {
			if (imageUrl.startsWith('blob:')) {
				window.dispatchEvent(
					new CustomEvent('admin-drop-error', {
						detail: { message: 'Can\'t drag from a webpage. Drag from desktop, use the upload button, or copy the image and paste (Cmd+V).' }
					})
				);
			} else {
				window.dispatchEvent(
					new CustomEvent('admin-image-url-drop', { detail: { url: imageUrl } })
				);
			}
		}
	});
}
