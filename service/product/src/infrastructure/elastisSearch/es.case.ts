import ESModel from "./es.model";
import { EsRepositoryCase } from "./es.repository";

export default class EsCase implements EsRepositoryCase {
    constructor(private esModel = new ESModel()) { }
    
    index = async () => {}
    update = async () => {}
    search = async () => {}
    delete = async (id: string) => {
        await this.esModel.delete(id);
    }
    buildQuery = async () => {}
}