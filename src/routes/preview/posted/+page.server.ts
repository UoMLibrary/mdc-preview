import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const teistring = data.get('teistring');
		return { teistring };
	}
};
