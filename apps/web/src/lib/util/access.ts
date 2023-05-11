import type { ProjectAccessLevel } from 'src/store/editor';

export function compareAccess(check: ProjectAccessLevel, against: ProjectAccessLevel) {
	if (check == 'READ') {
		return true;
	} else if (check == 'COMMENT') {
		return against == 'WRITE' || against == 'COMMENT';
	} else if (check == 'WRITE') {
		return against == 'WRITE';
	} else {
		return false;
	}
}
