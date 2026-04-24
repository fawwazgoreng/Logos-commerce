import { EsRepositoryModel } from "./es.repository";
import { elasticsearch } from "./setup"

export default class ESModel implements EsRepositoryModel {
    private INDEX = "product";
    constructor(private es = elasticsearch) { }
    
    search = async () => {
        
    }
    
    index = async (data: any) => {
        return await this.es.index({
            index: this.INDEX,
            ...data
        });
    }
    
    update = async (id: string, data: any) => {
        return await this.es.update({
            index: this.INDEX,
            id,
            ...data
        });
    }
    
    delete = async (id: string) => {
        await this.es.delete({
            index: this.INDEX,
            id,
            refresh: "wait_for"
        });
    }
}