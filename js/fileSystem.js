import structure from "../data/fileSystem.json" assert { type: "json" };

const DEFAULT_FILES = {
  documents: [
    {
      name: "Welcome.txt",
      type: "text",
      content: "Welcome to macOS WebOS.\nThis is a simulated document saved in localStorage.",
    },
  ],
};

export class VirtualFileSystem {
  constructor(state) {
    this.state = state;
    this.structure = this.mergeStructure(structure, state.getVirtualFiles() ?? DEFAULT_FILES);
  }

  mergeStructure(fsStructure, persisted) {
    const merged = JSON.parse(JSON.stringify(fsStructure));
    merged.documents = persisted.documents ?? [];
    return merged;
  }

  serialize() {
    return {
      documents: this.structure.documents,
    };
  }

  listDirectory(pathSegments) {
    if (!pathSegments.length) {
      return {
        directories: Object.keys(this.structure.directories),
        files: this.structure.rootFiles,
      };
    }
    let current = this.structure.directories;
    for (const segment of pathSegments) {
      if (!current[segment]) {
        return null;
      }
      if (current[segment].directories) {
        current = current[segment].directories;
      }
    }
    const node = this.resolveNode(pathSegments);
    if (!node) return null;
    return {
      directories: Object.keys(node.directories ?? {}),
      files: node.files ?? [],
    };
  }

  resolveNode(pathSegments) {
    if (!pathSegments.length) return null;
    let node = { directories: this.structure.directories };
    for (const segment of pathSegments) {
      node = node.directories?.[segment];
      if (!node) return null;
    }
    return node;
  }

  listDocuments() {
    return this.structure.documents;
  }

  getDocument(name) {
    return this.structure.documents.find((doc) => doc.name === name) ?? null;
  }

  saveDocument(name, content) {
    const existing = this.getDocument(name);
    if (existing) {
      existing.content = content;
      existing.updated = Date.now();
    } else {
      this.structure.documents.push({
        name,
        type: "text",
        content,
        created: Date.now(),
      });
    }
    this.state.setVirtualFiles(this.serialize());
  }

  renameDocument(oldName, newName) {
    const existing = this.getDocument(oldName);
    if (!existing) return false;
    existing.name = newName;
    existing.updated = Date.now();
    this.state.setVirtualFiles(this.serialize());
    return true;
  }

  removeDocument(name) {
    this.structure.documents = this.structure.documents.filter((doc) => doc.name !== name);
    this.state.setVirtualFiles(this.serialize());
  }
}
