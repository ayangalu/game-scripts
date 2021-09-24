import { BinaryReader, DataArray, DataType } from '../../binary';
import { TypeTree } from './type-tree';
import { Version } from './version';

export class SerializedType {
	readonly classId: number;
	readonly isStripped: boolean;
	readonly scriptTypeIndex: number;
	readonly scriptId: number[];
	readonly oldTypeHash: number[];
	readonly tree?: TypeTree;
	readonly reference?: { className: string; namespace: string; asmName: string };
	readonly dependencies?: readonly number[];

	constructor(reader: BinaryReader, version: number, hasTypeTree: boolean, readonly isReferenceType: boolean) {
		this.classId = reader.next(DataType.Int32);
		this.isStripped = version >= Version.RefactoredClassId && reader.next(DataType.Bool);
		this.scriptTypeIndex = version >= Version.RefactorTypeData ? reader.next(DataType.Int16) : -1;

		this.scriptId = [];
		this.oldTypeHash = [];

		if (version >= Version.HasTypeTreeHashes) {
			if (
				(isReferenceType && this.scriptTypeIndex >= 0) ||
				(version < Version.RefactoredClassId && this.classId < 0) ||
				(version >= Version.RefactoredClassId && this.classId === 114)
			) {
				this.scriptId = reader.next(DataArray(DataType.UInt8, 16));
			}

			this.oldTypeHash = reader.next(DataArray(DataType.UInt8, 16));
		}

		if (hasTypeTree) {
			this.tree = new TypeTree(reader, version);

			if (version >= Version.StoresTypeDependencies) {
				if (isReferenceType) {
					this.reference = {
						className: reader.next(DataType.StringUTF8),
						namespace: reader.next(DataType.StringUTF8),
						asmName: reader.next(DataType.StringUTF8),
					};
				} else {
					this.dependencies = reader.next(DataArray(DataType.Int32, reader.next(DataType.UInt32)));
				}
			}
		}
	}
}
